import React from "react";
import { NavLink, NavLinkProps } from "react-router-dom";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

const PromptedNavLink: React.FC<NavLinkProps> = ({ to, onClick, ...props }) => {
  const { hasUnsavedChanges } = useUnsavedChanges();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasUnsavedChanges) {
      if (
        !window.confirm(
          "You have unsaved changes that will be lost. Are you sure you want to leave this page?",
        )
      ) {
        // If the user clicks "Cancel", prevent the navigation.
        event.preventDefault();
      }
    }
    // If there are no unsaved changes, or if the user clicks "OK", proceed with the original onClick handler (if any) and the navigation.
    if (onClick) {
      onClick(event);
    }
  };

  return <NavLink to={to} onClick={handleClick} {...props} />;
};

export default PromptedNavLink;
