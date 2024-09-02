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
import { Link, Redirect, Route, Router, Switch } from "wouter";

import NotFound from "./NotFound.tsx";
import GamePage from "./routes/games/game/GamePage.tsx";
import GamesPage from "./routes/games/GamesPage.tsx";

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
            Game Index
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
                Game Index
              </SideNavLink>
            </HeaderSideNavItems>
          </SideNavItems>
        </SideNav>
      </Header>
      <Content id="main-content">
        <Switch>
          <Route path="/">
            <Redirect to="/games" />
          </Route>
          <Route path="/games">
            <GamesPage />
          </Route>
          <Route path="/games/:gameId">
            {({ gameId }) => <GamePage gameId={gameId} />}
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
