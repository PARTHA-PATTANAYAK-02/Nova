import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "@/hooks/useTheme";

const ThemeToggle = () => {
  const { dark, setDark } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setDark((current) => !current)}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="w-full justify-start gap-3 rounded-xl text-current hover:bg-black/10 dark:hover:bg-white/10"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      <span className="hidden lg:inline">
        {dark ? "Light mode" : "Dark mode"}
      </span>
    </Button>
  );
};

export default ThemeToggle;
