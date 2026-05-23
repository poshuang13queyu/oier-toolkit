import React, { useState } from 'react';
import DataGenPage from './DataGenPage';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<'home' | 'dataGen' | 'duipai' | 'manual'>('home');

  return (
    <div style={{ padding: '16px' }}>
      <h2>OIer Toolkit</h2>
      <nav style={{ marginBottom: '16px' }}>
        <button onClick={() => setActivePage('home')}>首页</button>
        <button onClick={() => setActivePage('dataGen')}>造数据</button>
        <button onClick={() => setActivePage('duipai')}>对拍</button>
        <button onClick={() => setActivePage('manual')}>手册</button>
      </nav>
      <main>
        {activePage === 'home' && <div>欢迎使用 OIer Toolkit</div>}
        {activePage === 'dataGen' && <DataGenPage />}
        {activePage === 'duipai' && <div>对拍管理器（待实现）</div>}
        {activePage === 'manual' && <div>竞赛实战手册（待实现）</div>}
      </main>
    </div>
  );
};

export default App;