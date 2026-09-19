import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";

export default function CountUp({ value, duration = 1.2, isCurrency = false, className = "font-mono text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight" }) {
  const elementRef = useRef(null);
  const valueRef = useRef({ val: 0 });

  useEffect(() => {
    if (!elementRef.current) return;
    
    // Create a GSAP context to ensure proper cleanup on unmount
    const ctx = gsap.context(() => {
      gsap.to(valueRef.current, {
        val: value,
        duration: duration,
        ease: "power2.out",
        onUpdate: () => {
          if (elementRef.current) {
            const roundedVal = Math.round(valueRef.current.val);
            elementRef.current.innerText = isCurrency
              ? "₹" + roundedVal.toLocaleString("en-IN")
              : roundedVal.toLocaleString("en-IN");
          }
        }
      });
    }, elementRef);

    return () => ctx.revert(); // proper cleanup!
  }, [value, duration, isCurrency]);

  return (
    <span ref={elementRef} className={className}>
      {isCurrency ? "₹0" : "0"}
    </span>
  );
}
