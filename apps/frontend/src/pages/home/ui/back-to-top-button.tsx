import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@acme/frontend/shared/ui/button";

export function BackToTopButton(props: React.ComponentProps<typeof Button>) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 10) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <Button
      size="icon"
      variant="outline"
      className={`fixed right-4 bottom-4 z-10 rounded-full transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      {...props}
    >
      <ChevronUp />
      <span className="sr-only">Вверх</span>
    </Button>
  );
}
