import { Link, LinkProps } from "@carbon/react";

export function ExternalLink(props: LinkProps<"a">) {
  return (
    <Link
      {...props}
      children={<abbr title={props.href}>{props.children}</abbr>}
      target="_blank"
    />
  );
}
