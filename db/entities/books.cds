using {
  cuid,
  managed,
  Currency
} from '@sap/cds/common';

namespace com.iqbal.cap;

entity Authors : cuid, managed {
  name      : String;
  bio       : String;
  isDeleted : Boolean default false;
  books     : Association to many Books
                on books.author = $self;

}

entity Books : cuid, managed {
  author    : Association to Authors;
  title     : localized String;
  descr     : localized String;
  stock     : Integer;
  price     : Decimal(13, 2);
  currency  : Currency;
  isDeleted : Boolean default false;

}

annotate Authors with {
  name @mandatory;
  bio  @mandatory;
};

annotate Books with {
  author @mandatory;
  descr  @mandatory;
  stock  @mandatory;
};
