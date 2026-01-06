// src/app/components/NewsletterEmail.tsx
import React from 'react';
import { Article } from '@/lib/fetchUpdates';

interface Props {
  articles: Article[];
}

const NewsletterEmail: React.FC<Props> = ({ articles }) => {
  return (
    <table 
      align="center" 
      width="700" 
      cellPadding={0} 
      cellSpacing={0} 
      style={{ backgroundColor: '#ffffff', borderCollapse: 'collapse', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}
    >
      <tbody>
        {/* Header */}
        <tr>
          <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px', color: '#555' }}>
            Vol. 1 — Jan 5, 2026
          </td>
        </tr>

        {/* Title */}
        <tr>
          <td style={{ padding: '20px', textAlign: 'center', fontSize: '24px', color: '#3C8BFF', fontWeight: 'bold' }}>
            REGULATORY UPDATES
          </td>
        </tr>

        {/* Articles */}
        {articles.map((item) => (
          <tr key={item.id}>
            <td style={{ padding: '10px 20px', fontSize: '14px', color: '#333', lineHeight: '1.5' }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{item.title}</h3>
              <p style={{ margin: '0 0 5px 0' }}>{item.summary_text}</p>
              <a 
                href={item.link} 
                style={{ color: '#2C74FF', textDecoration: 'underline', fontWeight: 'bold' }}
              >
                Learn more
              </a>
            </td>
          </tr>
        ))}

        {/* Footer */}
        <tr>
          <td style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#888' }}>
            © 2026 Regintels. All rights reserved.
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default NewsletterEmail;
