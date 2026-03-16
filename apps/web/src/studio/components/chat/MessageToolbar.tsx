import React, { useCallback } from 'react';
import {
  Trash2,
  Copy,
  Pencil,
  RefreshCw,
  Merge,
  Download,
  CheckSquare,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import {
  selectSelectedMessageIds,
  selectIsMultiSelectMode,
  clearSelection,
} from '../../store/messageSelection';
import { useTranslation } from 'react-i18next';

interface MessageToolbarProps {
  messageId: string;
  isAssistant?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (ids: string[]) => void;
  onRegenerate?: (id: string) => void;
  onCopy?: (id: string) => void;
  onMerge?: (ids: string[]) => void;
  onExport?: (ids: string[]) => void;
}

const MessageToolbar: React.FC<MessageToolbarProps> = ({
  messageId,
  isAssistant = false,
  onEdit,
  onDelete,
  onRegenerate,
  onCopy,
  onMerge,
  onExport,
}) => {
  const dispatch = useDispatch();
  const selectedIds = useSelector(selectSelectedMessageIds);
  const isMultiSelect = useSelector(selectIsMultiSelectMode);
  const { t } = useTranslation();

  const isSelected = selectedIds.includes(messageId);

  const handleToggleSelect = useCallback(() => {
    dispatch(
      require('../../store/messageSelection').toggleMessageSelection(messageId)
    );
  }, [dispatch, messageId]);

  const handleDelete = useCallback(() => {
    const ids = isMultiSelect ? selectedIds : [messageId];
    onDelete?.(ids);
    if (isMultiSelect) dispatch(clearSelection());
  }, [isMultiSelect, selectedIds, messageId, onDelete, dispatch]);

  const handleCopy = useCallback(() => {
    onCopy?.(messageId);
  }, [messageId, onCopy]);

  const handleMerge = useCallback(() => {
    onMerge?.(selectedIds);
    dispatch(clearSelection());
  }, [selectedIds, onMerge, dispatch]);

  const handleExport = useCallback(() => {
    const ids = isMultiSelect ? selectedIds : [messageId];
    onExport?.(ids);
    if (isMultiSelect) dispatch(clearSelection());
  }, [isMultiSelect, selectedIds, messageId, onExport, dispatch]);

  if (isMultiSelect && !isSelected && !selectedIds.includes(messageId)) {
    return (
      <button
        onClick={handleToggleSelect}
        className="message-toolbar-select"
        title={t('chat.selectMessage')}
      >
        <CheckSquare size={14} />
      </button>
    );
  }

  return (
    <div className="message-toolbar">
      {isMultiSelect ? (
        <>
          <button onClick={handleToggleSelect} title={t('chat.deselect')}>
            <CheckSquare size={14} className="selected" />
          </button>
          <button onClick={handleMerge} title={t('chat.mergeSelected')}>
            <Merge size={14} />
          </button>
          <button onClick={handleDelete} title={t('chat.deleteSelected')}>
            <Trash2 size={14} />
          </button>
          <button onClick={handleExport} title={t('chat.exportSelected')}>
            <Download size={14} />
          </button>
          <button onClick={handleCopy} title={t('chat.copy')}>
            <Copy size={14} />
          </button>
        </>
      ) : (
        <>
          <button onClick={handleToggleSelect} title={t('chat.selectMessage')}>
            <CheckSquare size={14} />
          </button>
          {isAssistant && onRegenerate && (
            <button onClick={() => onRegenerate(messageId)} title={t('chat.regenerate')}>
              <RefreshCw size={14} />
            </button>
          )}
          {onEdit && (
            <button onClick={() => onEdit(messageId)} title={t('chat.edit')}>
              <Pencil size={14} />
            </button>
          )}
          <button onClick={handleCopy} title={t('chat.copy')}>
            <Copy size={14} />
          </button>
          <button onClick={handleDelete} title={t('chat.delete')}>
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
};

export default MessageToolbar;
