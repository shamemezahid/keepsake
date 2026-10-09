"use client";

import React, { useState } from "react";
import { StoreProvider, useStore } from "@/hooks/useStore";
import { Header } from "@/components/Header";
import { ContainerList } from "@/components/ContainerList";
import { BookmarkModal } from "@/components/BookmarkModal";
import { PrivacyModal } from "@/components/PrivacyModal";
import { ImportReportModal } from "@/components/ImportReportModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

function BookmarkBoardApp() {
  const { isLoaded, containers, deleteBookmark, deleteContainer } = useStore();

  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [bookmarkModalData, setBookmarkModalData] = useState(null); // { bookmark, containerId } or null
  const [defaultContainerId, setDefaultContainerId] = useState(null);

  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [importReportData, setImportReportData] = useState(null);
  const [isImportReportOpen, setIsImportReportOpen] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState(null);

  // Avoid hydration mismatch by waiting for client-side storage hydration
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-bg" />
    );
  }

  const handleOpenAdd = (targetContainerId = null) => {
    setBookmarkModalData(null);
    setDefaultContainerId(targetContainerId);
    setIsBookmarkModalOpen(true);
  };

  const handleEditBookmark = (bookmark, containerId) => {
    setBookmarkModalData({ bookmark, containerId });
    setDefaultContainerId(containerId);
    setIsBookmarkModalOpen(true);
  };

  const handleDeleteBookmark = (containerId, bookmarkId) => {
    const container = containers.find((c) => c.id === containerId);
    const bookmark = container?.bookmarks?.find((b) => b.id === bookmarkId);
    const title = bookmark?.title ? `"${bookmark.title}"` : "this bookmark";
    setDeleteModalData({
      title: "Delete bookmark",
      description: `Are you sure you want to delete ${title}?`,
      onConfirm: () => deleteBookmark(containerId, bookmarkId),
    });
  };

  const handleDeleteContainer = (container) => {
    const title = container.title ? `"${container.title}"` : "Untitled";
    const bookmarkCount = container.bookmarks?.length || 0;
    const description =
      bookmarkCount > 0
        ? `Are you sure you want to delete ${title}? ${bookmarkCount} ${
            bookmarkCount === 1 ? "bookmark" : "bookmarks"
          } inside will also be removed.`
        : `Are you sure you want to delete ${title}?`;

    setDeleteModalData({
      title: "Delete container",
      description,
      onConfirm: () => deleteContainer(container.id),
    });
  };

  const handleShowImportReport = (reportResult) => {
    setImportReportData(reportResult);
    setIsImportReportOpen(true);
  };

  return (
    <div className="min-h-screen bg-bg text-text px-6 pb-24">
      <div className="max-w-[1200px] mx-auto">
        <Header
          onOpenAddBookmark={() => handleOpenAdd(null)}
          onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
          onShowImportReport={handleShowImportReport}
        />

        <main>
          <ContainerList
            onEditBookmark={handleEditBookmark}
            onDeleteBookmark={handleDeleteBookmark}
            onDeleteContainer={handleDeleteContainer}
            onAddBookmarkToContainer={(cId) => handleOpenAdd(cId)}
          />
        </main>
      </div>

      {/* Bookmark Add / Edit Modal */}
      <BookmarkModal
        open={isBookmarkModalOpen}
        onOpenChange={setIsBookmarkModalOpen}
        initialData={bookmarkModalData}
        defaultContainerId={defaultContainerId}
      />

      {/* Privacy Note Modal */}
      <PrivacyModal
        open={isPrivacyModalOpen}
        onOpenChange={setIsPrivacyModalOpen}
      />

      {/* Import Report Modal */}
      <ImportReportModal
        open={isImportReportOpen}
        onOpenChange={setIsImportReportOpen}
        reportData={importReportData}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={Boolean(deleteModalData)}
        onOpenChange={(open) => !open && setDeleteModalData(null)}
        title={deleteModalData?.title}
        description={deleteModalData?.description}
        onConfirm={deleteModalData?.onConfirm}
      />
    </div>
  );
}

export default function Page() {
  return (
    <StoreProvider>
      <BookmarkBoardApp />
    </StoreProvider>
  );
}
