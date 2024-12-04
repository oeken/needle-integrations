import type { AnchorHTMLAttributes } from "react";

export function A(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      className={`${props.className} font-bold text-blue-500 hover:underline`}
    >
      {props.children}
    </a>
  );
}
