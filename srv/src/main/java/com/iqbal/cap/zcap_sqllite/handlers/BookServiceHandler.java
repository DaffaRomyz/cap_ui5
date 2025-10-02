package com.iqbal.cap.zcap_sqllite.handlers;

import org.springframework.stereotype.Component;

import com.sap.cds.ql.Select;
import com.sap.cds.services.ErrorStatuses;
import com.sap.cds.services.ServiceException;
import com.sap.cds.services.cds.CdsCreateEventContext;
import com.sap.cds.services.cds.CqnService;
import com.sap.cds.services.handler.EventHandler;
import com.sap.cds.services.handler.annotations.Before;
import com.sap.cds.services.handler.annotations.ServiceName;
import com.sap.cds.services.persistence.PersistenceService;

import cds.gen.bookservice.Authors_;
import cds.gen.bookservice.BookService_;
import cds.gen.bookservice.Books;
import cds.gen.bookservice.Books_;

@Component
@ServiceName(BookService_.CDS_NAME)
public class BookServiceHandler implements EventHandler {

    private final PersistenceService db;

    public BookServiceHandler(PersistenceService db) {
        this.db = db;
    }

    @Before(event = CqnService.EVENT_CREATE, entity = Books_.CDS_NAME)
    public void beforeCreateBook(CdsCreateEventContext context, Books book) {
        // Validate book title
        if (book.getTitle() == null || book.getTitle().isEmpty()) {
            throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Book title is required!");
        }

        // Validate author
        String authorID = book.getAuthorId();
        if (authorID == null || authorID.isEmpty()) {
            throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Author ID is required!");
        }

        // Check if author exists
        boolean authorExists = db.run(Select.from(Authors_.class)
                .columns(Authors_.ID)
                .where(a -> a.ID().eq(authorID)))
                .first().isPresent();

        if (!authorExists) {
            throw new RuntimeException("Author with ID " + authorID + " does not exist!");
        }

        System.out.println("Author exists: " + authorExists);
    }
}