from sqlalchemy.orm import Session

from app.modules.rag_agent.state import AgentState
from app.modules.rag_agent.tools import get_data_summary, get_student_profile_summary, search_school_groups


def intent_node(state: AgentState) -> AgentState:
    message = state.get("message", "")
    if any(word in message for word in ["推荐", "怎么报", "志愿", "冲稳保"]):
        intent = "recommendation"
    elif any(word in message for word in ["政策", "规则", "批次", "平行志愿"]):
        intent = "policy"
    else:
        intent = "general"
    return {**state, "intent": intent, "events": state.get("events", []) + [{"type": "node_end", "node": "intent_node", "intent": intent}]}


def make_tool_node(db: Session):
    def tool_node(state: AgentState) -> AgentState:
        summary = get_data_summary(db)
        profile_summary = get_student_profile_summary(db, state["user_id"])
        groups = search_school_groups(db)
        tool_calls = state.get("tool_calls", []) + [
            {"tool_name": "get_data_summary", "result": summary},
            {"tool_name": "get_student_profile", "result": profile_summary},
            {"tool_name": "search_school_groups", "result": {"count": groups["count"]}},
        ]
        citations = state.get("citations", []) + [{"source_type": "database", "source_title": "本地招生数据", "metadata": summary}]
        return {
            **state,
            "tool_calls": tool_calls,
            "citations": citations,
            "events": state.get("events", []) + [{"type": "tool_call", "tool": "search_school_groups"}],
        }

    return tool_node


def explain_node(state: AgentState) -> AgentState:
    intent = state.get("intent", "general")
    summary_call = next((call for call in state.get("tool_calls", []) if call["tool_name"] == "get_data_summary"), None)
    summary = summary_call["result"] if summary_call else {"school_count": 0, "group_count": 0}

    if intent == "recommendation":
        answer = (
            "当前后端 Agent 已通过 LangGraph 完成意图识别和工具调用。"
            f"数据库中已有 {summary['school_count']} 所院校、{summary['group_count']} 个院校专业组。"
            "后续接入推荐引擎后，会基于位次、选科、批次和偏好生成冲稳保方案。"
        )
    elif intent == "policy":
        answer = "政策类问题后续会优先检索 published 状态知识库，并返回来源引用。当前知识库模块还未接入正式检索。"
    else:
        answer = "我可以帮助查询院校专业组、解释政策规则、生成冲稳保推荐和志愿方案。"

    return {**state, "answer": answer, "events": state.get("events", []) + [{"type": "final"}]}
