
import {Aspect } from "./aspect/aspect";
import {allocate, entryPoint, execute} from "@artela/aspect-libs";

// 2.register aspect Instance
const aspect = new Aspect()
entryPoint.setAspect(aspect)
entryPoint.setOperationAspect(aspect)

// 3.must export it
export {execute, allocate}