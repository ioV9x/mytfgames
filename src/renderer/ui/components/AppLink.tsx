import { Link as CarbonLink } from "@carbon/react";
import { Link as WouterLink } from "wouter";

export function AppLink(props: React.ComponentProps<typeof CarbonLink>) {
  return <CarbonLink as={WouterLink} {...props} />;
}
