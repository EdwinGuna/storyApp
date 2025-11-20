import HomePage from "../pages/home/home-page";
import AboutPage from "../pages/about/about-page";

import RegisterPage from "../pages/auth/register-page";
import LoginPage from "../pages/auth/login-page";
import AddStoryPage from "../pages/story/add-story-page";

import DetailPage from "../pages/detail/detail-page";
import BookmarkPage from "../pages/bookmark/bookmark-page";

const routes = {
  "/": new HomePage(),
  "/stories": new HomePage(),
  "/about": new AboutPage(),
  "/register": new RegisterPage(),
  "/login": new LoginPage(),
  "/add": new AddStoryPage(),
  "/stories/:id": new DetailPage(),
  "/bookmark": new BookmarkPage(),
};

export default routes;
