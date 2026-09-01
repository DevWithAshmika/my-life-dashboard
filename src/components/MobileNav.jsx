import {
  Menu,
  LayoutDashboard,
  Wallet,
  CheckSquare,
  CalendarDays,
} from "lucide-react";

export default function MobileNav({
  activePage,
  setActivePage,
  onMenuClick,
}) {
  const items = [
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

  return (
    <div className="fixed bottom-4 left-3 right-3 z-50 lg:hidden">
      <nav className="mx-auto flex max-w-md items-center justify-around rounded-[26px] border border-white/10 bg-black/70 px-1 py-1.5 shadow-2xl backdrop-blur-2xl">

        {items.map((item) => {
          const Icon = item.icon;

          const active =
            activePage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActivePage(item.id);
              }}
              className={`flex min-w-[60px] flex-col items-center gap-1 rounded-2xl px-2 py-2 transition ${
                active
                  ? "bg-white text-black"
                  : "text-white/40 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Icon
                size={17}
                strokeWidth={
                  active ? 2.2 : 1.7
                }
              />

              <span className="text-[9px] font-medium">
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onMenuClick}
          className="flex min-w-[60px] flex-col items-center gap-1 rounded-2xl px-2 py-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
        >
          <Menu size={18} />

          <span className="text-[9px] font-medium">
            Menu
          </span>
        </button>

      </nav>
    </div>
  );
}