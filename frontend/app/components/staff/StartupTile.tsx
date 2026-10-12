import { Link } from "react-router";

import { Icon, type IconName } from "~/components/ui/Icon";

interface StartupTileProps {
  to: string;
  title: string;
  description: string;
  icon: IconName;
}

/** A screen the role may use: tea tile, link, moss fill on hover. */
export function StartupTile({ to, title, description, icon }: StartupTileProps) {
  return (
    <Link
      to={to}
      className="group box-border flex min-h-30 flex-col gap-2 rounded-md bg-tea p-4 text-forest no-underline hover:bg-moss hover:text-white"
    >
      <span className="flex items-center gap-2 text-heading font-bold tracking-heading">
        <Icon name={icon} />
        {title}
      </span>
      <span className="text-body tracking-body text-moss group-hover:text-white">
        {description}
      </span>
    </Link>
  );
}
