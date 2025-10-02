sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  (Controller, Fragment, MessageToast, MessageBox) => {
    "use strict";

    return Controller.extend("booklist.controller.BookList", {
      // Holds the dialog instance so we load it only once
      _oAuthorDialog: null,

      // Lifecycle hook—could initialize additional logic if needed
      onInit() {},

      // Handler for the "Add Author" button: lazy-loads the fragment and opens the dialog
      onAddAuthor: async function () {
        if (!this._oAuthorDialog) {
          this._oAuthorDialog = await Fragment.load({
            id: this.getView().getId(),
            name: "booklist.view.AddAuthorDialog",
            controller: this,
          });
        }
        this._oAuthorDialog.open();
      },

      // Handler for the dialog’s "Cancel" button: cleanly close and destroy the fragment
      onDialogCancel: function () {
        this._closeAndDestroyDialog();
      },

      // Handler for the dialog’s "Create" button:
      // - Reads user inputs
      // - Sends an OData CREATE request
      // - Shows success or error feedback
      // - Closes the dialog and refreshes the list
      onAddAuthorConfirm: async function () {
        const oModel = this.getView().getModel();
        const sViewId = this.getView().getId();
        const sName = Fragment.byId(sViewId, "addNameInput").getValue().trim();
        const sBio = Fragment.byId(sViewId, "addBioInput").getValue().trim();
        const bodyData = { name: sName, bio: sBio };

        try {
          // Bind to /Authors and issue CREATE; wait for completion
          const oListBinding = oModel.bindList("/Authors");
          await oListBinding.create(bodyData).created();
          MessageToast.show("Author created");
        } catch (error) {
          // Show an error dialog if the request fails
          MessageBox.error(error.message);
        }

        this._closeAndDestroyDialog();
        this._refreshAuthorList();
      },

      // Closes and destroys the dialog fragment to free resources
      _closeAndDestroyDialog: function () {
        this._oAuthorDialog.close();
        this._oAuthorDialog.destroy();
        this._oAuthorDialog = null;
      },

      // Refreshes the authors list so newly created entries appear immediately
      _refreshAuthorList: function () {
        const oList = this.byId("authorList");
        const oBinding = oList && oList.getBinding("items");
        if (oBinding) {
          oBinding.refresh();
        }
      },
    });
  }
);
