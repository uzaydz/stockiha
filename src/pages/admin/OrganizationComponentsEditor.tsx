import React from 'react';
import Layout from '@/components/Layout';
import OrganizationComponentsContainer from '@/components/organization-editor/OrganizationComponentsContainer';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

interface OrganizationComponentsEditorPageProps extends POSSharedLayoutControls {}

const OrganizationComponentsEditorPage: React.FC<OrganizationComponentsEditorPageProps> = ({ useStandaloneLayout = true } = {}) => {
  const content = <OrganizationComponentsContainer />;
  return useStandaloneLayout ? <Layout>{content}</Layout> : content;
};

export default React.memo(OrganizationComponentsEditorPage);
