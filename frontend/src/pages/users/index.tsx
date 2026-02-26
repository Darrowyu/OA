import { useState } from 'react';
import { Plus, Search, Users, Building2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NativeSelect as Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserTable } from './components/UserTable';
import { UserForm } from './components/UserForm';
import { UserDetail } from './components/UserDetail';
import { BatchActions } from './components/BatchActions';
import { ResetPasswordDialog } from './components/ResetPasswordDialog';
import { ImportModal } from './components/ImportModal';
import { DepartmentSelect } from './components/DepartmentSelect';
import { DepartmentManagement } from './components/DepartmentManagement';
import { useUserManagement } from './hooks/useUserManagement';
import { ROLE_OPTIONS, STATUS_OPTIONS } from './config/roleConfig';

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('users');
  const {
    users,
    loading,
    error,
    successMessage,
    filters,
    pagination,
    sortField,
    sortOrder,
    selectedIds,
    isFormOpen,
    isDetailOpen,
    isResetPasswordOpen,
    isImportOpen,
    selectedUser,
    formLoading,
    handleSearch,
    handleReset,
    setSearchKeyword,
    setRoleFilter,
    setDepartmentFilter,
    setStatusFilter,
    setPage,
    handleSort,
    setSelectedIds,
    handleSelectAll,
    openCreateDialog,
    openEditDialog,
    openDetailDrawer,
    openResetPasswordDialog,
    setIsFormOpen,
    setIsDetailOpen,
    setIsResetPasswordOpen,
    setIsImportOpen,
    handleCreate,
    handleEdit,
    handleToggleStatus,
    handleResetPassword,
    handleDelete,
    handleBatchEnable,
    handleBatchDisable,
    handleBatchDelete,
    handleExport,
    handleImport,
  } = useUserManagement();

  return (
    <div className="h-screen overflow-auto">
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)]">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">组织管理</h1>
          <p className="text-gray-500 mt-1">管理用户账号、部门结构和权限配置</p>
        </div>

        {/* 成功提示 */}
        {successMessage && (
          <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs 切换 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              用户列表
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              部门管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* 筛选栏 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">关键词搜索</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="搜索用户名、姓名、邮箱"
                      value={filters.searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="pl-9"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                </div>

                <div className="w-40">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">角色</label>
                  <Select
                    options={ROLE_OPTIONS}
                    value={filters.roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  />
                </div>

                <div className="w-48">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">部门</label>
                  <DepartmentSelect
                    value={filters.departmentFilter}
                    onChange={setDepartmentFilter}
                    placeholder="全部部门"
                    showAllOption
                  />
                </div>

                <div className="w-32">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">状态</label>
                  <Select
                    options={STATUS_OPTIONS}
                    value={filters.statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  />
                </div>

                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  搜索
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  重置
                </Button>
              </div>
            </div>

            {/* 工具栏 */}
            <div className="flex items-center justify-between">
              <BatchActions
                selectedIds={selectedIds}
                onBatchEnable={handleBatchEnable}
                onBatchDisable={handleBatchDisable}
                onBatchDelete={handleBatchDelete}
                onExport={handleExport}
                onClearSelection={() => setSelectedIds([])}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  批量导入
                </Button>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  新建用户
                </Button>
              </div>
            </div>

            {/* 用户列表 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <UserTable
                users={users}
                loading={loading}
                selectedIds={selectedIds}
                pagination={pagination}
                sortField={sortField}
                sortOrder={sortOrder}
                onSelect={setSelectedIds}
                onSelectAll={handleSelectAll}
                onSort={handleSort}
                onPageChange={setPage}
                onEdit={openEditDialog}
                onToggleStatus={handleToggleStatus}
                onResetPassword={openResetPasswordDialog}
                onDelete={handleDelete}
                onViewDetail={openDetailDrawer}
              />
            </div>
          </TabsContent>

          <TabsContent value="departments">
            <DepartmentManagement />
          </TabsContent>
        </Tabs>
      </main>

      {/* 用户表单对话框 */}
      <UserForm
        user={selectedUser}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={selectedUser ? handleEdit : handleCreate}
        loading={formLoading}
      />

      {/* 用户详情抽屉 */}
      <UserDetail
        user={selectedUser}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={(user) => {
          setIsDetailOpen(false);
          openEditDialog(user);
        }}
        onToggleStatus={handleToggleStatus}
        onResetPassword={(user) => {
          setIsDetailOpen(false);
          openResetPasswordDialog(user);
        }}
      />

      {/* 重置密码对话框 */}
      <ResetPasswordDialog
        user={selectedUser}
        open={isResetPasswordOpen}
        onOpenChange={setIsResetPasswordOpen}
        onConfirm={handleResetPassword}
      />

      {/* 批量导入对话框 */}
      <ImportModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImport={handleImport}
      />
    </div>
  );
}
