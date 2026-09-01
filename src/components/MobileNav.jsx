import {
  LayoutDashboard,
  Wallet,
  CheckSquare,
  CalendarDays,
  Menu,
} from "lucide-react";

export default function MobileNav({
  user,
  activePage,
  setActivePage,
  onMenuClick,
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
  };

  return (
    <>
      {/* =====================================================
          MOBILE TOP HEADER
      ====================================================== */}

      <div className="mb-5 flex items-center justify-between lg:hidden">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-white">
            My Dashboard
          </h1>

          <p className="mt-1 truncate text-xs text-white/30">
            {user?.displayName ||
              user?.email ||
              "Personal Dashboard"}
          </p>
        </div>

        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="relative z-50 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/70 backdrop-blur-xl transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* =====================================================
          MOBILE BOTTOM BAR
      ====================================================== */}

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
            bg-[#111]/95
            px-1.5
            py-1.5
            shadow-[0_-10px_40px_rgba(0,0,0,0.35)]
            backdrop-blur-2xl
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
                  transition-all
                  duration-200
                  ${
                    isActive
                      ? "bg-white text-black shadow-md"
                      : "text-white/40 hover:bg-white/[0.06] hover:text-white"
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

          {/* =================================================
              MENU
          ================================================== */}

          <button
            type="button"
            aria-label="Open menu"
            onClick={onMenuClick}
            className="
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
              text-white/40
              transition-all
              duration-200
              hover:bg-white/[0.06]
              hover:text-white
              active:scale-95
            "
          >
            <Menu
              size={19}
              strokeWidth={1.8}
            />

            <span className="text-[9px] font-medium">
              Menu
            </span>
          </button>
        </nav>
      </div>
    </>
  );
}