import {
  Menu,
} from "lucide-react";

import AppNotifications from "./AppNotifications";

export default function Header({
  user,
  onMenuClick,
}) {
  return (
    <header className="sticky top-0 z-30 mb-6 flex h-16 items-center justify-between border-b border-white/5 bg-black/40 px-4 backdrop-blur-2xl sm:px-6">

      {/* LEFT */}

      <button
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/60 transition hover:bg-white/10 lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* RIGHT */}

      <div className="ml-auto flex items-center gap-3">

        <AppNotifications
          user={user}
        />

        {user?.photoURL && (
          <img
            src={user.photoURL}
            alt="Profile"
            className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10"
          />
        )}

      </div>

    </header>
  );
}