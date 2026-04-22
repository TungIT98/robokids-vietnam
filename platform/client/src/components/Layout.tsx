import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import css from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className={css.container}>
      <Sidebar />
      <main className={css.main}>
        {children}
      </main>
    </div>
  );
}
