sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/Fragment",
        "sap/m/MessageToast",
        "sap/m/MessageBox",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
    ],
    (Controller, Fragment, MessageToast, MessageBox, Filter, FilterOperator) => {
        "use strict";

        return Controller.extend("booklist.controller.BookList", {
            // Holds the dialog instance so we load it only once
            _oAuthorDialog: null,

            // Holds the book dialog instance (Add or Edit) so we load it only once
            _oBookDialog: null,

            // Stores the selected author’s binding context when editing
            _oEditContext: null,

            // Stores the the selected author’s ID
            _sSelectedAuthorId: null,

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

            /**
       * Marks the given entity as deleted without removing it from the backend.
       * This “soft delete” simply sets the isDeleted flag to true,
       * allowing us to filter out or archive records without losing history.
       */
            _performSoftDelete: async function (oContext) {
                await oContext.setProperty("isDeleted", true);
            },

            /**
             * Permanently removes the given entity from the backend.
             * This “hard delete” issues an OData DELETE request on the context,
             * eliminating the record entirely.
             */
            _performHardDelete: async function (oContext) {
                await oContext.delete();
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
                            this._performSoftDelete(oContext);
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
                // Close and destroy author dialog
                if (this._oAuthorDialog) {
                    this._oAuthorDialog.close();
                    this._oAuthorDialog.destroy();
                    this._oAuthorDialog = null;
                }

                // Close and destroy book dialog
                if (this._oBookDialog) {
                    this._oBookDialog.close();
                    this._oBookDialog.destroy();
                    this._oBookDialog = null;
                }
            },

            // Refreshes the authors list so newly created entries appear immediately
            _refreshAuthorList: function () {
                const oList = this.byId("authorList");
                const oBinding = oList && oList.getBinding("items");
                if (oBinding) {
                    oBinding.refresh();
                }
            },

            onAuthorSelect: function () {
                // Get the reference to the author list control by its ID
                const oList = this.byId("authorList");

                // Get the currently selected item (author) from the list
                const oAuthorSelected = oList.getSelectedItem();

                // If no author is selected, exit the function
                if (!oAuthorSelected) {
                    return;
                }

                // Retrieve the ID of the selected author from its binding context
                const sAuthorId = oAuthorSelected.getBindingContext().getProperty("ID");
                this._sSelectedAuthorId = sAuthorId;

                // Call a private function to bind and display books related to the selected author
                this._bindBooks(sAuthorId);
            },

            _bindBooks: function (sAuthorID) {
                // Get a reference to the books table control by its ID
                const oTable = this.byId("booksTable");

                // If no author ID is provided, unbind the table and exit
                if (!sAuthorID) {
                    oTable.unbindItems();
                    return;
                }

                // Bind the table items to the /Books entity set, filtered by the selected author's ID
                oTable.bindItems({
                    path: "/Books", // OData entity set
                    filters: [new Filter("author_ID", FilterOperator.EQ, sAuthorID)], // Show only books matching the selected author
                    template: new sap.m.ColumnListItem({
                        cells: [
                            // Display the book title
                            new sap.m.Text({ text: "{title}" }),
                            // Display the book description
                            new sap.m.Text({ text: "{descr}" }),
                            // Display the stock as a number
                            new sap.m.ObjectNumber({ number: "{stock}" }),
                            // Display the price along with its currency code
                            new sap.m.ObjectNumber({
                                number: "{price}",
                                unit: "{currency_code}",
                            }),
                        ],
                    }),
                });
            },

            // Opens the “Add Book” dialog, loading it lazily the first time
            onAddBook: async function () {
                if (this._sSelectedAuthorId === null) {
                    MessageToast.show("Please select one author.");
                    return;
                }

                if (!this._oBookDialog) {
                    this._oBookDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "booklist.view.AddBookDialog",
                        controller: this,
                    });
                }
                this._oBookDialog.open();
            },

            // Reads input values, sends an OData CREATE for /Books, then refreshes the table
            onAddBookConfirm: async function () {
                const oModel = this.getView().getModel();
                const sFragId = this.getView().getId();

                // Retrieve and normalize input values
                const sTitle = Fragment.byId(sFragId, "addTitleInput")
                    .getValue()
                    .trim();
                const sDescr = Fragment.byId(sFragId, "addDescrInput")
                    .getValue()
                    .trim();
                let iStock = parseInt(
                    Fragment.byId(sFragId, "addStockInput").getValue().trim(),
                    10
                );
                const fPrice = Fragment.byId(sFragId, "addPriceInput")
                    .getValue()
                    .trim();
                const sCurrency = Fragment.byId(sFragId, "addCurrencyInput")
                    .getValue()
                    .trim()
                    .toUpperCase();
                const sAuthorId = this._sSelectedAuthorId; // selected author’s key

                // Build payload for the CREATE request
                const bodyData = {
                    author_ID: sAuthorId,
                    title: sTitle,
                    descr: sDescr,
                    stock: iStock,
                    price: fPrice,
                    currency: { code: sCurrency },
                };

                try {
                    // Issue CREATE against /Books and await confirmation
                    const oListBinding = oModel.bindList("/Books");
                    await oListBinding.create(bodyData).created();
                    MessageToast.show("Book created");
                    this._closeAndDestroyDialog();
                    this._refreshBooks();
                } catch (error) {
                    // Display error if the request fails
                    MessageBox.error(error.message);
                }
            },

            // Refreshes the books table so new entries appear immediately
            _refreshBooks: function () {
                const oTable = this.byId("booksTable");
                const oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.refresh();
                }
            },


        });
    }
);
