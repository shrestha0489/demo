import React from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const { signOut } = useAuthenticator();
  const navigate = useNavigate();

  return (
    <Button
      onClick={(e) => {
        e.preventDefault();
        signOut();
        navigate("/auth");
      }}
      variant="light"
      style={{ backgroundColor: "white" }}
    >
      Logout
    </Button>
  );
}
