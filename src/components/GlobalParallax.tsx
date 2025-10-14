import React from "react";
import "./GlobalParallax.css";

export default function GlobalParallax() {
  return (
    <div className="global-parallax" aria-hidden="true">
      <div className="clouds" />
      <div className="overlay" />
    </div>
  );
}
