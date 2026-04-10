import { Valeria } from "./valeria";
import { AgentOrchestrator } from "./agents";
import { IntelligentRouter } from "./router";

export let valeria: Valeria;
export let orchestrator: AgentOrchestrator;
export let router: IntelligentRouter;

export function setValeria(v: Valeria) { valeria = v; }
export function setOrchestrator(o: AgentOrchestrator) { orchestrator = o; }
export function setRouter(r: IntelligentRouter) { router = r; }
