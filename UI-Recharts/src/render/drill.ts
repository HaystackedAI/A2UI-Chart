import { createContext } from 'react'

// Drill bridge. @a2ui/react v0.12 does not expose an action-dispatch hook to custom
// (createComponentImplementation) components, so Chart cannot fire a native A2UI
// action on slice click. We bridge through a React context instead: useA2UIChart
// provides drill(value); Chart calls it onClick → the hook routes it to its own
// A2UI sendAction. In A2UIChart the host never sees this — A2UIChartView wires the Provider
// internally. Revisit on @a2ui/react 0.13+ (dispatch to custom components lands there).
export const A2UIChart_DrillContext = createContext<(value: string) => void>(() => {})
