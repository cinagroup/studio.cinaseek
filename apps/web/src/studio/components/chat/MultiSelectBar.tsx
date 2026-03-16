import React, { useCallback } from 'react';
import {
  CheckSquare,
  Square,
  Trash2,
  Merge,
  Download,
  X,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import {
  selectSelectedMessageIds,
  clearSelection,
  selectAllMessages,
} from '../../store/messageSelection';
import { useTranslation } from 'react-i18next';

interface MultiSelectBarProps {
  allMessageIds: string[];
  onDelete?: (ids: string[]) => void;
  onMerge?: (ids: string[]) => void;
  onExport?: (ids: string[]) => void;
}

const MultiSelectBar: React.FC<MultiSelectBarProps> = ({
  allMessageIds,
  onDelete,
  onMerge,
  onExport,
}) => {
  const dispatch = useDispatch();
  const selectedIds = useSelector(selectSelectedMessageIds);
  const { t } = useTranslation();

  const count = selectedIds.length;
  if (count === 0) return null;

  const isAllSelected = allMessageIds.length > 0 &&
    allMessageIds.every((id) => selectedIds.includes(id));

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      dispatch(clearSelection());
    } else {
      dispatch(selectAllMessages(allMessageIds));
    }
  }, [isAllSelected, allMessageIds, dispatch]);

  const handleDelete = useCallback(() => {
    onDelete?.(selectedIds);
    dispatch(clearSelection());
  }, [selectedIds, onDelete, dispatch]);

  const handleMerge = useCallback(() => {
    onMerge?.(selectedIds);
    dispatch(clearSelection());
  }, [selectedIds, onMerge, dispatch]);

  const handleExport = useCallback(() => {
    onExport?.(selectedIds);
    dispatch(clearSelection());
  }, [selectedIds, onExport, dispatch]);

  const handleClear = useCallback(() => {
    dispatch(clearSelection());
  }, [dispatch]);

  return (
    <div className="multi-select-bar">
      <span className="multi-select-count">
        {t('chat.selectedCount', { count })}
      </span>

      <div className="multi-select-actions">
        <button onClick={handleSelectAll} title={t('chat.selectAll')}>
          {isAllSelected ? <Square size={14} /> : <CheckSquare size={14} />}
          <span>{t('chat.selectAll')}</span>
        </button>

        <button onClick={handleMerge} title={t('chat.mergeSelected')} disabled={count < 2}>
          <Merge size={14} />
          <span>{t('chat.merge')}</span>
        </button>

        <button onClick={handleDelete} title={t('chat.deleteSelected')}>
          <Trash2 size={14} />
          <span>{t('chat.delete')}</span>
        </button>

        <button onClick={handleExport} title={t('chat.exportSelected')}>
          <Download size={14} />
          <span>{t('chat.export')}</span>
        </button>
      </div>

      <button onClick={handleClear} className="multi-select-close" title={t('chat.cancel')}>
        <X size={14} />
      </button>
    </div>
  );
};

export default MultiSelectBar;
