import "./App.css";

import { useContext, useEffect, useState } from "react";

import reactLogo from "./assets/react.svg";
import { IpcContext } from "./ipc/IpcContext.mjs";
import viteLogo from "./vite.svg";

function App() {
  const [count, setCount] = useState(0);

  const ipcContext = useContext(IpcContext);

  const [loginState, setLoginState] = useState("unknown");

  useEffect(
    () =>
      void (async () => {
        const value = await ipcContext?.user.isLoggedIn();
        setLoginState(value ? "logged in" : "logged out");
      })(),
  );

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <p>Login State: {loginState}</p>
    </>
  );
}

export default App;
