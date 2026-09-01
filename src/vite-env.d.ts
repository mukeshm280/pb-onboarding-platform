/// <reference types="vite/client" />

declare module '*.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '@bpmn-io/form-js/dist/assets/form-js.css';
