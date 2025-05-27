import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';

// استيراد محتوى الملف مباشرة
import customDomainsMarkdown from '../../../docs/custom-domains.md?raw';

const CustomDomainsDocPage: React.FC = () => {
  return (
    <Layout>
      <Helmet>
        <title>دليل إعداد النطاقات المخصصة | Bazaar</title>
      </Helmet>
      <div className="container py-6">
        <div className="flex flex-col space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="markdown-content prose prose-sm md:prose-base lg:prose-lg max-w-none overflow-auto rtl">
                <ReactMarkdown>{customDomainsMarkdown}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default CustomDomainsDocPage;
