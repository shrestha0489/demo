import React from "react";
import { useEffect } from "react";

import { Authenticator, useAuthenticator, View } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "./auth.css";

import { useNavigate, useLocation } from "react-router";

const components = {
  SignIn: {
    Header() {
      return (
        <h2
          className="text-3xl text-black pt-3"
          style={{ textAlign: "center" }}
        >
          Login
        </h2>
      );
    },
  },
};

export default function Login() {
  const { route } = useAuthenticator((context) => [context.route]);
  const location = useLocation();
  const navigate = useNavigate();
  let from = location.state?.from?.pathname || "/";
  useEffect(() => {
    if (route === "authenticated") {
      navigate(from, { replace: true });
    }
  }, [route, navigate, from]);
  return (
    <View className="auth-wrapper center">
      <Authenticator
        hideSignUp
        formFields={formFields}
        components={components}
      ></Authenticator>
    </View>
  );
}

const formFields = {
  signIn: {
    username: {
      label: "Email",
      placeholder: "Enter your email",
    },
  },
  signUp: {
    username: {
      label: "Email",
      placeholder: "Enter your email",
    },
  },
  resetPassword: {
    username: {
      label: "Email",
      placeholder: "Enter your email",
    },
  },
};
