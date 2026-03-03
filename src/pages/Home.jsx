import React from 'react';

import AppContainer from '@/components/AppContainer';

import Navbar from '@/components/Navbar';

import LiveFeedSection from '@/components/LiveFeedSection';

import PageFooter from '@/components/PageFooter';

import RouteAnnouncer from '@/components/RouteAnnouncer';


const Home = () => {
  return (
    <>

      <AppContainer />

      <Navbar />

      <LiveFeedSection />

      <PageFooter />

      <RouteAnnouncer />

    </>
  );
};

export default Home;