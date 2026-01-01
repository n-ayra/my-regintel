import React from 'react';
import { Layout as LayoutIcon, Twitter, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-[var(--foreground)]/10 bg-[var(--secondary)]">
      <div className="container mx-auto px-4 py-8 flex flex-col items-center">
        
        {/* Logo Area */}
        <div className="flex items-center gap-2 font-bold text-lg text-[var(--accent)] mb-3">
          <LayoutIcon className="h-5 w-5" />
          <span>Regintels</span>
        </div>

        {/* Copyright Line */}
        <div className="pt-2 text-center text-xs text-[var(--foreground)]/50">
          © {new Date().getFullYear()} Regintels. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;