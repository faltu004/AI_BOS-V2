import { Github } from "lucide-react";
import { Button } from "@shared/ui/button";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.2 3-7.3Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 5-0.9 6.6-2.5L15.4 17c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8l3.3-2.6Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.6l3.3 2.6c.8-2.4 3-4.1 5.6-4.1Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function SocialAuthButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button className="w-full" type="button" variant="outline">
        <GoogleIcon /> Google
      </Button>
      <Button className="w-full" type="button" variant="outline">
        <Github className="h-4 w-4" /> GitHub
      </Button>
    </div>
  );
}
