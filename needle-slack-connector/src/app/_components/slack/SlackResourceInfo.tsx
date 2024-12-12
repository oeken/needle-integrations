// First, let's define our icons as components
const InfoCircleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 16v-4"></path>
    <path d="M12 8h.01"></path>
  </svg>
);

const WarningTriangleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-triangle-alert text-yellow-600"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
    <path d="M12 9v4"></path>
    <path d="M12 17h.01"></path>
  </svg>
);

// Define types for our InfoCard props
interface InfoCardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  variant?: "default" | "warning";
}

// Create a reusable InfoCard component
const InfoCard = ({
  title,
  icon,
  description,
  variant = "default",
}: InfoCardProps) => {
  const borderClass =
    variant === "warning"
      ? "border-yellow-600"
      : "border-black dark:border-white";
  const bgClass =
    variant === "warning"
      ? "bg-yellow-50 dark:bg-yellow-950"
      : "bg-zinc-50 dark:bg-zinc-900";

  return (
    <div
      className={`mt-2 flex items-start gap-2 border-l-4 ${borderClass} ${bgClass} px-4 py-2`}
    >
      {icon}
      <div>
        <b>{title}</b>: {description}
      </div>
    </div>
  );
};

// Main component
export function SlackResourceInfo() {
  const infoItems = [
    {
      title: "Messages",
      icon: <InfoCircleIcon />,
      description:
        "Messages and their updates from your Slack channels will be synchronized to Needle. If a message is edited or updated, changes will be reflected in Needle.",
    },
    {
      title: "Channels",
      icon: <InfoCircleIcon />,
      description:
        "Public and private channels from your Slack workspace will be synchronized. All canvases attached to these channels will be automatically synced and updated in Needle.",
    },
    {
      title: "Canvases",
      icon: <InfoCircleIcon />,
      description:
        "New canvases can be attached to the channels after the connector is established. The sync will happen automatically as canvases are added or modified.",
    },
    {
      title: "Warning",
      icon: <WarningTriangleIcon />,
      variant: "warning" as const,
      description:
        "If tracked channels are archived or deleted from Slack, all associated canvases and messages will be removed from Needle. To prevent data loss, please edit or delete your connector before removing resources from Slack.",
    },
  ];

  return (
    <div className="mb-4 flex flex-col">
      {infoItems.map((item) => (
        <InfoCard
          key={item.title}
          title={item.title}
          icon={item.icon}
          variant={item.variant}
          description={item.description}
        />
      ))}
    </div>
  );
}
