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
export function ZendeskResourceInfo() {
  const infoItems = [
    {
      title: "Tickets",
      icon: <InfoCircleIcon />,
      description:
        "Support tickets and their updates from your Zendesk account will be synchronized to Needle. If a ticket is updated or new comments are added, changes will be reflected in Needle.",
    },
    {
      title: "Articles",
      icon: <InfoCircleIcon />,
      description:
        "Help center articles and their content from your Zendesk knowledge base will be synchronized. If an article is edited or published, changes will be reflected in Needle.",
    },
    {
      title: "Note",
      icon: <WarningTriangleIcon />,
      variant: "warning" as const,
      description:
        "If tracked tickets or articles are removed from Zendesk, the connector will be broken. To prevent the connector from breaking, please edit or delete your connector before removing resources from Zendesk.",
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
