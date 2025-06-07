import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import Stats from '../components/landing/Stats';
import Features from '../components/landing/Features';
import RoomCreation from '../components/landing/RoomCreation';
import Testimonials from '../components/landing/Testimonials';
import Footer from '../components/landing/Footer';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <Stats />
        <Features />
        <RoomCreation />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
} 