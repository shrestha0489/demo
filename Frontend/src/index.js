import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import Home from "./Screens/Home";
import Auth from "./Screens/Auth";
import RequireAuth from "./Components/RequireAuth";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolClientId: "260rmis9pg6prti7tf7opqbb7g",
      userPoolId: "us-east-1_aUKNy7Dm6",
    },
  },
});

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireAuth>
        <Home />
      </RequireAuth>
    ),
  },
  {
    path: "/auth",
    element: <Auth />,
  },
]);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Authenticator.Provider>
      <RouterProvider router={router} />
    </Authenticator.Provider>
  </React.StrictMode>,
);
