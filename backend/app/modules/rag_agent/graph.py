from langgraph.graph import END, StateGraph
from sqlalchemy.orm import Session

from app.modules.rag_agent.nodes import explain_node, intent_node, make_tool_node
from app.modules.rag_agent.state import AgentState


def build_agent_graph(db: Session):
    graph = StateGraph(AgentState)
    graph.add_node("intent_node", intent_node)
    graph.add_node("tool_node", make_tool_node(db))
    graph.add_node("explain_node", explain_node)

    graph.set_entry_point("intent_node")
    graph.add_edge("intent_node", "tool_node")
    graph.add_edge("tool_node", "explain_node")
    graph.add_edge("explain_node", END)
    return graph.compile()
