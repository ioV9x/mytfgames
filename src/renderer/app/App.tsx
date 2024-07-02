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

import GameDetails from "../features/games/GameDetails.tsx";
import NewLocalGame from "../features/local-games/create/CreateLocalGamePage.tsx";
import LocalGameIndex from "../features/local-games/LocalGamesIndex.tsx";
import LocalGameViewPage from "../features/local-games/view/LocalGameViewPage.tsx";
import RemoteGameIndex from "../features/remote-games/RemoteGameIndex.tsx";
import NotFound from "./NotFound.tsx";

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
          <HeaderMenuItem href="/remote-games" as={Link}>
            Online DB
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
              <SideNavLink href="/remote-games" as={Link}>
                Online DB
              </SideNavLink>
            </HeaderSideNavItems>
          </SideNavItems>
        </SideNav>
      </Header>
      <Content id="main-content">
        <Switch>
          <Route path="/">
            <LocalGameIndex />
          </Route>
          <Route path="/local-games">
            <LocalGameIndex />
          </Route>
          <Route path="/local-games/new">
            <NewLocalGame />
          </Route>
          <Route path="/local-games/:gameId">
            {({ gameId }) => <LocalGameViewPage gameId={gameId} />}
          </Route>
          <Route path="/games/:gameId">
            {({ gameId }) => <GameDetails gameId={gameId} />}
          </Route>
          <Route path="/remote-games">
            <RemoteGameIndex />
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
