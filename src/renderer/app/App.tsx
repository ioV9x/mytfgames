import {
  Content,
  GlobalTheme,
  Header,
  HeaderContainer,
  HeaderMenuButton,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  HeaderSideNavItems,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkipToContent,
} from "@carbon/react";
import { useEffect } from "react";
import { Link, Route, Router, Switch } from "wouter";

import Games from "../features/games/Games.tsx";
import NotFound from "./NotFound.tsx";
import Root from "./Root.tsx";

interface HeaderContainerRenderProps {
  isSideNavExpanded: boolean;
  onClickSideNavExpand: () => void;
}
function AppWithShell({
  isSideNavExpanded,
  onClickSideNavExpand,
}: HeaderContainerRenderProps) {
  return (
    <>
      <Header aria-label="My TFGames">
        <SkipToContent />
        <HeaderMenuButton
          aria-label={isSideNavExpanded ? "Close menu" : "Open menu"}
          aria-expanded={isSideNavExpanded}
          onClick={onClickSideNavExpand}
          isActive={isSideNavExpanded}
        />
        <HeaderName href="/" prefix="My" as={Link}>
          TFGames
        </HeaderName>
        <HeaderNavigation aria-label="My TFGames">
          <HeaderMenuItem href="/games" as={Link}>
            Games
          </HeaderMenuItem>
        </HeaderNavigation>
        <SideNav
          aria-label="Side navigation"
          expanded={isSideNavExpanded}
          isPersistent={false}
          onSideNavBlur={onClickSideNavExpand}
          href="#main-content"
        >
          <SideNavItems>
            <HeaderSideNavItems>
              <SideNavLink href="/games" as={Link}>
                Games
              </SideNavLink>
            </HeaderSideNavItems>
          </SideNavItems>
        </SideNav>
      </Header>
      <Content id="main-content">
        <Switch>
          <Route path="/">
            <Root />
          </Route>
          <Route path="/games">
            <Games />
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </Content>
    </>
  );
}

function App() {
  const theme = "g90";

  useEffect(() => {
    document.documentElement.dataset["carbonTheme"] = theme;
  }, [theme]);

  return (
    <GlobalTheme theme={theme}>
      <Router>
        <HeaderContainer render={AppWithShell} />
      </Router>
    </GlobalTheme>
  );
}

export default App;
