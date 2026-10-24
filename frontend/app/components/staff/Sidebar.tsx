import { NavLink } from "react-router";

import { Icon, type IconName } from "~/components/ui/Icon";
import { screensForRole } from "~/lib/access";
import { staffName } from "~/lib/api/auth";
import { ROLE_LABELS, type Staff } from "~/lib/api/types";
import { cx } from "~/lib/cx";

/**
 * 240px forest sidebar. Sticky on wide screens; under 880px it becomes a row
 * above the content. Only destinations permitted for the staff role are shown;
 * route loaders and the API enforce access independently.
 */
const TAB =
  "box-border flex min-h-12 w-full items-center gap-3 rounded-md border-0 bg-transparent px-3 " +
  "text-left text-body leading-[normal] font-bold tracking-bold text-page no-underline cursor-pointer " +
  "[&:hover:not([aria-current=page])]:bg-moss aria-[current=page]:bg-tea aria-[current=page]:text-forest";

function TabIcon({ name }: { name: IconName }) {
  return <Icon name={name} />;
}

interface SidebarProps {
  staff: Staff;
  onSignOut: () => void;
}

export function Sidebar({ staff, onSignOut }: SidebarProps) {
  return (
    <aside className="on-forest box-border flex-[0_0_240px] bg-forest text-page max-[880px]:basis-full">
      <div
        className={cx(
          // An opaque fill lets the browser keep sub-pixel text AA on the sticky layer.
          "box-border flex flex-col gap-6 bg-forest px-3 py-6",
          "sticky top-[env(safe-area-inset-top,0px)]",
          "max-[880px]:static max-[880px]:p-4",
        )}
      >
        <span className="px-3 text-wordmark">Restaurant DBMS</span>
        <nav
          aria-label="Main"
          className="flex flex-col gap-1 max-[880px]:flex-row max-[880px]:flex-wrap"
        >
          {screensForRole(staff.role).map((screen) => (
            <NavLink key={screen.key} to={screen.path} className={cx(TAB, "max-[880px]:w-auto")}>
              <TabIcon name={screen.icon} />
              {screen.nav}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-moss pt-4 max-[880px]:flex-row max-[880px]:flex-wrap max-[880px]:items-center">
          <div className="px-3">
            <span className="block text-body font-bold">{staffName(staff)}</span>
            <span className="block text-label tracking-caption">{ROLE_LABELS[staff.role]}</span>
          </div>
          <button type="button" onClick={onSignOut} className={cx(TAB, "max-[880px]:w-auto")}>
            <Icon name="signOut" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
