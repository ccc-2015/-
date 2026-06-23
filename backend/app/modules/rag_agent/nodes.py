from sqlalchemy.orm import Session

from app.modules.rag_agent.state import AgentState
from app.modules.rag_agent.tools import (
    generate_user_recommendations,
    get_data_summary,
    get_student_profile_summary,
    search_published_knowledge,
    search_school_groups,
)


def intent_node(state: AgentState) -> AgentState:
    message = state.get("message", "")
    if any(word in message for word in ["政策", "规则", "批次", "平行志愿", "投档", "退档", "录取", "调剂"]):
        intent = "policy"
    elif any(word in message for word in ["推荐", "怎么报", "志愿", "冲稳保", "院校", "专业组"]):
        intent = "recommendation"
    else:
        intent = "general"
    return {**state, "intent": intent, "events": state.get("events", []) + [{"type": "node_end", "node": "intent_node", "intent": intent}]}


def make_tool_node(db: Session):
    def tool_node(state: AgentState) -> AgentState:
        intent = state.get("intent", "general")
        message = state.get("message", "")
        summary = get_data_summary(db)
        profile_summary = get_student_profile_summary(db, state["user_id"])
        tool_calls = state.get("tool_calls", []) + [
            {"tool_name": "get_data_summary", "result": summary},
            {"tool_name": "get_student_profile", "result": profile_summary},
        ]
        citations = state.get("citations", []) + [{"source_type": "database", "source_title": "本地招生数据", "metadata": summary}]
        events = state.get("events", [])

        if intent == "recommendation":
            recommendations = generate_user_recommendations(db, state["user_id"], limit=5)
            tool_calls.append({"tool_name": "generate_recommendations", "result": recommendations})
            events.append({"type": "tool_call", "node": "tool_node", "tool": "generate_recommendations"})
            if recommendations.get("ok") and recommendations.get("items"):
                citations.append(
                    {
                        "source_type": "database",
                        "source_title": "推荐引擎结果",
                        "metadata": {"batch": recommendations.get("batch"), "item_count": len(recommendations["items"])},
                    }
                )
        elif intent == "policy":
            knowledge = search_published_knowledge(db, message, limit=5)
            tool_calls.append({"tool_name": "search_published_knowledge", "arguments": {"query": message}, "result": knowledge})
            events.append({"type": "tool_call", "node": "tool_node", "tool": "search_published_knowledge"})
            citations.extend(
                {
                    "source_type": "knowledge_document",
                    "source_title": item["title"],
                    "source_url": item.get("source_url"),
                    "metadata": {
                        "document_id": item["id"],
                        "chunk_id": item.get("chunk_id"),
                        "chunk_index": item.get("chunk_index"),
                        "version": item["version"],
                        "category": item.get("category"),
                        "score": item.get("score"),
                        "score_detail": item.get("score_detail"),
                    },
                }
                for item in knowledge.get("items", [])
            )
        else:
            groups = search_school_groups(db)
            tool_calls.append({"tool_name": "search_school_groups", "result": {"count": groups["count"], "items": groups["items"]}})
            events.append({"type": "tool_call", "node": "tool_node", "tool": "search_school_groups"})

        return {
            **state,
            "tool_calls": tool_calls,
            "citations": citations,
            "events": events,
        }

    return tool_node


def explain_node(state: AgentState) -> AgentState:
    intent = state.get("intent", "general")
    if intent == "recommendation":
        answer = _recommendation_answer(state)
    elif intent == "policy":
        answer = _policy_answer(state)
    else:
        answer = _general_answer(state)

    return {**state, "answer": answer, "events": state.get("events", []) + [{"type": "final"}]}


def _recommendation_answer(state: AgentState) -> str:
    profile = _tool_result(state, "get_student_profile") or {}
    result = _tool_result(state, "generate_recommendations") or {}
    if not profile.get("exists"):
        return "还没有找到你的考生画像。请先维护年份、科类、成绩、位次、选科和目标批次，再生成冲稳保推荐。"
    if not result.get("ok"):
        return f"暂时不能生成推荐：{result.get('error', '推荐引擎未返回有效结果')}。"

    items = result.get("items", [])
    lines = [
        f"按当前画像，我调用推荐引擎生成了 {result.get('batch') or '目标批次'} 的候选结果。",
        f"画像信息：{profile.get('year')} 年 {profile.get('province')}，{profile.get('subject_track') or '未填写科类'}，分数 {profile.get('score') or '-'}，位次 {profile.get('rank') or '-'}。",
    ]
    warnings = result.get("warnings") or []
    if warnings:
        lines.append("需要先注意：" + "；".join(warnings[:3]))
    if not items:
        lines.append("当前没有检索到可推荐的院校专业组，通常是因为还没导入对应年份、批次、科类的院校专业组、招生计划或历年录取数据。")
        return "\n".join(lines)

    lines.append("优先查看这几项：")
    for index, item in enumerate(items[:5], start=1):
        rank_text = f"，历史最低位次 {item['historical_min_rank']}" if item.get("historical_min_rank") else ""
        plan_text = f"，计划 {item['plan_count']} 人" if item.get("plan_count") is not None else ""
        reason = "；".join((item.get("reasons") or [])[:2]) or "推荐理由待补充"
        warning = "；".join((item.get("warnings") or [])[:1])
        line = (
            f"{index}. {item['school_name']} {item['group_name']}（{item['group_code']}）："
            f"{item['risk_level']}，匹配 {item['match_score']} 分{rank_text}{plan_text}。{reason}。"
        )
        if warning:
            line += f" 提醒：{warning}。"
        lines.append(line)
    lines.append("这些结果来自考生画像、院校专业组、招生计划和历年录取数据；最终排序还需要人工核对招生章程、专业范围和是否服从调剂。")
    return "\n".join(lines)


def _policy_answer(state: AgentState) -> str:
    knowledge = _tool_result(state, "search_published_knowledge") or {}
    items = knowledge.get("items", [])
    if not items:
        return (
            "我检索了已发布知识库，但没有命中可引用的政策文档。"
            "请先在管理端发布对应政策或招生章程，再让 Agent 回答政策类问题。"
        )

    lines = ["我检索了已发布知识库，以下是可引用内容的摘要："]
    for index, item in enumerate(items[:3], start=1):
        excerpt = item.get("excerpt", "").replace("\n", " ").strip()
        lines.append(f"{index}. {item['title']}：{excerpt[:180]}")
    lines.append("政策类结论需要以引用文档为准；如果问题涉及具体可报性，还应同时调用画像和规则校验。")
    return "\n".join(lines)


def _general_answer(state: AgentState) -> str:
    summary = _tool_result(state, "get_data_summary") or {}
    profile = _tool_result(state, "get_student_profile") or {}
    profile_text = "已维护考生画像" if profile.get("exists") else "尚未维护考生画像"
    return (
        f"当前本地库中有 {summary.get('school_count', 0)} 所院校、{summary.get('group_count', 0)} 个院校专业组、"
        f"{summary.get('plan_count', 0)} 条招生计划、{summary.get('historical_admission_count', 0)} 条历年录取记录，"
        f"已发布知识库文档 {summary.get('published_knowledge_count', 0)} 份。{profile_text}。"
        "你可以继续问推荐、政策规则、院校专业组或志愿方案校验。"
    )


def _tool_result(state: AgentState, tool_name: str):
    for call in state.get("tool_calls", []):
        if call.get("tool_name") == tool_name:
            return call.get("result")
    return None
