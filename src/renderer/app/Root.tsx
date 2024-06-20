import { useContext, useEffect, useState } from "react";

import { IpcContext } from "../ipc/IpcContext.mjs";

export default function Root() {
  const ipcContext = useContext(IpcContext);
  const [count, setCount] = useState(0);
  const [loginState, setLoginState] = useState("unknown");

  useEffect(() => {
    void (async () => {
      const value = await ipcContext?.user.isLoggedIn();
      setLoginState(value ? "logged in" : "logged out");
    })();
  }, [ipcContext]);

  return (
    <>
      <h1>Vite + React</h1>
      <div>
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p>Click on the Vite and React logos to learn more</p>
      <p>Login State: {loginState}</p>
    </>
  );
}
