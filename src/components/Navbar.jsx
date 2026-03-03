import React from 'react';

/**
 * Navbar - Primary navigation bar containing the brand logo and main site navigation links.
 *
 * Auto-generated from captured website.
 * Key elements: brand logo, Tournament link, Rankings link, Tavern link
 * Styling: flex row, justify-between, sticky top, dark background
 */
const Navbar = ({
  brandName = '',
  navLinks = ''
}) => {
  return (
    <>
      {/* Navbar - Primary navigation bar containing the brand logo and main site navigation links. */}
      <nav className="Navbar-module__cRh5nW__navbar"><div className="container Navbar-module__cRh5nW__navContainer"><a className="Navbar-module__cRh5nW__logo"><img alt="Klaw Arena" className="Navbar-module__cRh5nW__logoImage" src="/assets/images/arena_klawarena_xyz_logo_8ab037ec.png"/><span className="Navbar-module__cRh5nW__logoText">Klaw Arena</span><span className="Navbar-module__cRh5nW__logoBeta">beta</span></a><div className="Navbar-module__cRh5nW__navLinks"><a className="Navbar-module__cRh5nW__navLink Navbar-module__cRh5nW__active"><span className="Navbar-module__cRh5nW__navIcon">📡</span><span className="Navbar-module__cRh5nW__navLabel">Feed</span><span className="Navbar-module__cRh5nW__badge Navbar-module__cRh5nW__live">●</span></a><a className="Navbar-module__cRh5nW__navLink"><span className="Navbar-module__cRh5nW__navIcon">👑</span><span className="Navbar-module__cRh5nW__navLabel">Tournament</span><span className="Navbar-module__cRh5nW__badge Navbar-module__cRh5nW__soon">SOON</span></a><a className="Navbar-module__cRh5nW__navLink"><span className="Navbar-module__cRh5nW__navIcon">🏆</span><span className="Navbar-module__cRh5nW__navLabel">Rankings</span></a><a className="Navbar-module__cRh5nW__navLink"><span className="Navbar-module__cRh5nW__navIcon">🍺</span><span className="Navbar-module__cRh5nW__navLabel">Tavern</span></a><a className="Navbar-module__cRh5nW__navLink"><span className="Navbar-module__cRh5nW__navIcon">📊</span><span className="Navbar-module__cRh5nW__navLabel">Stats</span><span className="Navbar-module__cRh5nW__badge Navbar-module__cRh5nW__hot">HOT</span></a><a className="Navbar-module__cRh5nW__navLink"><span className="Navbar-module__cRh5nW__navIcon">🗺️</span><span className="Navbar-module__cRh5nW__navLabel">Map</span></a></div><button aria-label="Toggle menu" className="Navbar-module__cRh5nW__menuToggle"><span className="Navbar-module__cRh5nW__menuBar"></span></button></div></nav>
    </>
  );
};

export default Navbar;