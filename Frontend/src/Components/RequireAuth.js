import React from "react";
import PropTypes from "prop-types"; // Import PropTypes
import { useLocation, Navigate } from "react-router-dom";
import { useAuthenticator } from "@aws-amplify/ui-react";

export default function RequireAuth({ children }) {
  const location = useLocation();
  const { route } = useAuthenticator((context) => [context.route]);

  if (route !== "authenticated") {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
}

// Add PropTypes validation
RequireAuth.propTypes = {
  children: PropTypes.node.isRequired,
};
