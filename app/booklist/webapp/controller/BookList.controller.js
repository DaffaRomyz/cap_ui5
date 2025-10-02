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

      // Stores the selected author’s binding context when editing
      _oEditContext: null,

      // Lifecycle hook—could initialize additional logic if needed
      onInit() { },

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

      /**
      * onEditAuthor
      * Ensures exactly one author is selected, saves its context,
      * pre-fills the Edit dialog inputs, and opens the dialog.
      */
      onEditAuthor: async function () {
        const oList = this.byId("authorList");
        const aContexts = oList.getSelectedContexts();

        if (aContexts.length !== 1) {
          MessageToast.show("Please select one author to edit.");
          return;
        }

        // Keep the selected context for the update call
        this._oEditContext = aContexts[0];
        const oData = this._oEditContext.getObject();

        // Load the Edit fragment if not already loaded
        if (!this._oAuthorDialog) {
          this._oAuthorDialog = await Fragment.load({
            id: this.getView().getId(),
            name: "booklist.view.EditAuthorDialog",
            controller: this,
          });
        }

        // Prefill dialog fields with the selected author’s current data
        const sFragId = this.getView().getId();
        Fragment.byId(sFragId, "editNameInput").setValue(oData.name);
        Fragment.byId(sFragId, "editBioInput").setValue(oData.bio);

        this._oAuthorDialog.open();
      },

      onDeleteAuthor: function () {
        // Get reference to the authors list control
        const oList = this.byId("authorList");
        // Retrieve all selected contexts (binding contexts) from the list
        const aContexts = oList.getSelectedContexts();
        
        // Ensure exactly one author is selected before proceeding
        if (aContexts.length !== 1) {
          MessageToast.show("Please select one author to delete.");
          return;
        }
        // We only care about the first selected context
        const oContext = aContexts[0];
        
        
        // Show a confirmation dialog before hard-deleting the record
        MessageBox.confirm("Are you sure you want to delete this author?", {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          onClose: async function (sAction) {
            // If the user cancels, do nothing
            if (sAction !== MessageBox.Action.OK) {
              return;
            }

            try {
              // Perform the OData V4 delete operation on the selected context
              await oContext.delete();
              MessageToast.show("Author deleted successfully.");

              // Refresh the list so the deleted entry is removed from the UI
              this._refreshAuthorList();
            } catch (error) {
              // Show an error dialog if the delete request fails
              MessageBox.error(error.message);
            }
          }.bind(this)  // Bind the handler so we can access `this._refreshAuthorList()`
        });
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

      /**
       * onEditAuthorConfirm
       * Reads updated values, updates the bound context properties,
       * submits the OData update batch, shows feedback,
       * then closes the dialog and refreshes the list.
       */
      onEditAuthorConfirm: async function () {
        const sFragId = this.getView().getId();
        const oModel = this.getView().getModel();
        const sName = Fragment.byId(sFragId, "editNameInput").getValue().trim();
        const sBio = Fragment.byId(sFragId, "editBioInput").getValue().trim();
        const oContext = this._oEditContext; // previously stored binding context

        try {
          // Update the properties in the context
          await oContext.setProperty("name", sName);
          await oContext.setProperty("bio", sBio);
          MessageToast.show("Author updated");
        } catch (error) {
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
