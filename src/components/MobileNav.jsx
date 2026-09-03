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
        pb-3
        pt-2
        lg:hidden
      "
      style={{
        paddingBottom:
          "calc(12px + env(safe-area-inset-bottom))",
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
          justify-between
          rounded-[26px]
          border
          border-white/10
          bg-[#111111]
          px-1.5
          py-1.5
          shadow-2xl
        "
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            activePage === item.id;

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
              className={`
                flex
                min-h-[54px]
                flex-1
                flex-col
                items-center
                justify-center
                gap-1
                rounded-2xl
                px-1
                py-2
                active:scale-95
                ${
                  isActive
                    ? "bg-white text-black shadow-md"
                    : "text-white/45 active:bg-white/[0.10]"
                }
              `}
            >
              <Icon
                size={18}
                strokeWidth={
                  isActive ? 2.3 : 1.8
                }
              />

              <span className="text-[9px] font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}