import { type ReactNode } from "react";

export type BaseProps = {
  id?: string;
  children?: ReactNode | ReactNode[];
  className?: string;
};
