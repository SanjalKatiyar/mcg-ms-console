import * as React from 'react';
import {
  K8sResourceCommon,
  RowProps,
  TableColumn,
  TableData,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { sortable } from '@patternfly/react-table';
import { NooBaaBucketClassModel } from '../../models';
import { K8sResourceKind, BucketClassKind } from '../../types';
import { getDataResources } from '../../utils';
import { OperandStatus } from '../../utils/generics/operand-status';
import { CustomKebabItemsType, Kebab } from '../../utils/kebab/kebab';
import { GenericListPage } from '../../utils/list-page/list-page';
import { LaunchModal } from '../../utils/modals/modalLauncher';
import { getName } from '../../utils/selectors/k8s';
import { bucketClaimResource } from '../resources';
import { DataResourcesPopOver, OBCPopOver } from './ResourcePopOver';

const tableColumnInfo = [
  { className: '', id: 'name' },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-sm'),
    id: 'status',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-lg'),
    id: 'type',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-md'),
    id: 'data-source',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-md'),
    id: 'obc',
  },
  { className: 'dropdown-kebab-pf pf-c-table__action', id: '' },
];

export const RowRenderer: React.FC<RowProps<BucketClassKind, CustomData>> = ({
  obj,
  activeColumnIDs,
  rowData,
}) => {
  const { t } = useTranslation();
  const { launchModal, kebabActions, resourceMap } = rowData;
  const bucketPolicyName = getName(obj);
  const obcCount = resourceMap[bucketPolicyName]?.length || 0;
  const dataResources = getDataResources(obj);
  const dataResourceCount = dataResources?.length || 0;
  const dataResourceLabel = t('{{dataResourceCount}} data source', {
    dataResourceCount: dataResourceCount,
  });
  const obcLabel = t('{{obcCount}} OBC', { obcCount });
  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        {bucketPolicyName}
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        <OperandStatus operand={obj} />
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        {obj?.spec?.namespacePolicy?.type}
      </TableData>
      <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
        {!!dataResourceCount ? (
          <DataResourcesPopOver
            label={dataResourceLabel}
            dataResources={dataResources}
          />
        ) : (
          dataResourceLabel
        )}
      </TableData>
      <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
        {!!obcCount ? (
          <OBCPopOver
            label={obcLabel}
            obcDetails={resourceMap[bucketPolicyName]}
          />
        ) : (
          obcLabel
        )}
      </TableData>
      <TableData {...tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
        <Kebab
          launchModal={launchModal}
          extraProps={{
            resource: obj,
            resourceModel: NooBaaBucketClassModel,
          }}
          customKebabItems={kebabActions}
        />
      </TableData>
    </>
  );
};

export const useBucketPolicyList = () => {
  const { t } = useTranslation();

  const [obcData, obcLoaded, obcError] =
    useK8sWatchResource<K8sResourceKind[]>(bucketClaimResource);

  const tableColumns = React.useMemo<TableColumn<K8sResourceCommon>[]>(
    () => [
      {
        title: t('Name'),
        sort: 'metadata.name',
        transforms: [sortable],
        props: {
          className: tableColumnInfo[0].className,
        },
        id: tableColumnInfo[0].id,
      },
      {
        title: t('Status'),
        props: {
          className: tableColumnInfo[1].className,
        },
        id: tableColumnInfo[1].id,
      },
      {
        title: t('Data source type'),
        props: {
          className: tableColumnInfo[2].className,
        },
        id: tableColumnInfo[2].id,
      },
      {
        title: t('Data source'),
        props: {
          className: tableColumnInfo[3].className,
        },
        id: tableColumnInfo[3].id,
      },
      {
        title: t('ObjectBucketClaims'),
        props: {
          className: tableColumnInfo[4].className,
        },
        id: tableColumnInfo[4].id,
      },
      {
        title: '',
        props: {
          className: tableColumnInfo[5].className,
        },
        id: tableColumnInfo[5].id,
      },
    ],
    [t]
  );

  const objectBucketClaimMap = React.useMemo(
    () =>
      obcLoaded && !obcError
        ? obcData?.reduce((obcMap, obc) => {
            const bucketClass: string =
              obc?.spec?.additionalConfig?.bucketclass;
            const obcDetails: OBCDetails = {
              name: obc?.metadata?.name,
              ns: obc?.metadata?.namespace,
            };
            obcMap[bucketClass] = obcMap.hasOwnProperty(bucketClass)
              ? [...obcMap[bucketClass], obcDetails]
              : [obcDetails];
            return obcMap;
          }, {} as ObjectBucketClaimMap)
        : ({} as ObjectBucketClaimMap),
    [obcData, obcLoaded, obcError]
  );

  return [tableColumns, objectBucketClaimMap];
};

export const BucketPolicyListView: React.FC = () => {
  const { t } = useTranslation();
  const [tableColumns, objectBucketClaimMap] = useBucketPolicyList();

  return (
    <GenericListPage
      resourceModel={NooBaaBucketClassModel}
      resourceMap={objectBucketClaimMap}
      tableColumns={tableColumns as TableColumn<K8sResourceCommon>[]}
      createButtonTitle={t('Create bucket')}
      kebabActions={(t) => ({
        Delete: {
          value: t('Delete bucket'),
        },
      })}
    >
      {RowRenderer}
    </GenericListPage>
  );
};

type ObjectBucketClaimMap = {
  [key: string]: OBCDetails[];
};

type OBCDetails = {
  name: string;
  ns: string;
};

type CustomData = {
  launchModal: LaunchModal;
  kebabActions?: CustomKebabItemsType;
  resourceMap: ObjectBucketClaimMap;
};