import {
  LayoutDashboard,
  Wallet,
  CheckSquare,
  CalendarDays,
} from "lucide-react";

export default function MobileNav({
  activePage,
  setActivePage,
}) {
  const navigationItems = [
    {
      id: "dashboard",
      label: "Home",
      icon: LayoutDashboard,
    },
    {
      id: "finance",
      label: "Finance",
      icon: Wallet,
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: CheckSquare,
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: CalendarDays,
    },
  ];

  const handleNavigation = (page) => {
    if (activePage === page) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    if (typeof setActivePage === "function") {
      setActivePage(page);
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      className="
        pointer-events-none
        fixed
        bottom-0
        left-0
        right-0
        z-[70]
        px-3
        pt-2
        lg:hidden
      "
      style={{
        paddingBottom:
          "calc(10px + env(safe-area-inset-bottom))",
      }}
    >
      <nav
        className="
          pointer-events-auto
          mx-auto
          flex
          w-full
          max-w-md
          items-center
          gap-1
          rounded-[28px]
          border
          border-white/[0.12]
          bg-black/70
          px-1.5
          py-1.5
          shadow-[0_12px_40px_rgba(0,0,0,0.35)]
          backdrop-blur-2xl
          backdrop-saturate-150
        "
        style={{
          WebkitBackdropFilter:
            "blur(24px) saturate(180%)",
        }}
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-current={
                isActive ? "page" : undefined
              }
              onClick={() =>
                handleNavigation(item.id)
              }
              className="
                relative
                flex
                min-h-[54px]
                flex-1
                items-center
                justify-center
                rounded-[22px]
                px-1
                py-1.5
                outline-none
                transition-all
                duration-300
                ease-out
                active:scale-[0.94]
              "
            >
              {/* Active glass pill */}
              <span
                className={`
                  absolute
                  inset-[2px]
                  rounded-[20px]
                  transition-all
                  duration-300
                  ease-out
                  ${
                    isActive
                      ? "scale-100 bg-white shadow-[0_4px_18px_rgba(255,255,255,0.16)] opacity-100"
                      : "scale-90 bg-white/0 opacity-0"
                  }
                `}
              />

              {/* Content */}
              <span
                className="
                  relative
                  z-10
                  flex
                  flex-col
                  items-center
                  justify-center
                  gap-1
                "
              >
                <span
                  className={`
                    flex
                    items-center
                    justify-center
                    transition-all
                    duration-300
                    ease-out
                    ${
                      isActive
                        ? "scale-105 text-black"
                        : "scale-100 text-white/45"
                    }
                  `}
                >
                  <Icon
                    size={19}
                    strokeWidth={
                      isActive ? 2.4 : 1.8
                  }
                  className="
                    transition-all
                    duration-300
                  "
                  />
                </span>

                <span
                  className={`
                    text-[9px]
                    font-medium
                    leading-none
                    transition-all
                    duration-300
                    ${
                      isActive
                        ? "text-black opacity-100"
                        : "text-white/45 opacity-90"
                    }
                  `}
                >
                  {item.label}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}